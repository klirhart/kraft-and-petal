
-- ============================================================
-- KRAFT & PETAL
-- CUSTOMER IDs + MANUAL PAYMENT METHODS
-- ============================================================
-- Supported payment methods:
-- GCash, Maya, GoTyme, Cash on Delivery
--
-- Run AFTER the existing schema and access_rules migrations.
-- Preserve all existing customers, products, and orders.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. PERMANENT CUSTOMER IDs
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS
  public.customer_number_seq AS bigint;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS customer_number bigint;

ALTER TABLE public.profiles
ALTER COLUMN customer_number
SET DEFAULT nextval(
  'public.customer_number_seq'::regclass
);

-- Preserve previously assigned customer numbers.
-- Advance the sequence beyond existing customer numbers.

SELECT setval(
  'public.customer_number_seq',
  GREATEST(
    COALESCE(
      (SELECT MAX(customer_number) FROM public.profiles),
      0
    ),
    (SELECT last_value FROM public.customer_number_seq)
  ),
  true
);

-- Assign numbers only to customers missing one.

UPDATE public.profiles
SET customer_number =
  nextval('public.customer_number_seq'::regclass)
WHERE customer_number IS NULL;

ALTER TABLE public.profiles
ALTER COLUMN customer_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS
  profiles_customer_number_unique
ON public.profiles(customer_number);

-- Display format in the frontend:
-- CUST-000001
-- CUST-000002
-- CUST-000003

-- ============================================================
-- 2. PAYMENT INFORMATION
-- ============================================================

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_method text;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_status text;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_reference text;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_proof_path text;

-- Historical orders retain their existing information.
-- Previously unrecorded payment fields remain NULL.

-- ============================================================
-- 3. PAYMENT VALIDATION CONSTRAINTS
-- ============================================================

ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_payment_method_known;

ALTER TABLE public.orders
ADD CONSTRAINT orders_payment_method_known
CHECK (
  payment_method IS NULL
  OR payment_method IN (
    'gcash',
    'maya',
    'gotyme',
    'cod'
  )
);

ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_payment_status_known;

ALTER TABLE public.orders
ADD CONSTRAINT orders_payment_status_known
CHECK (
  payment_status IS NULL
  OR payment_status IN (
    'pending_verification',
    'unpaid_cod',
    'paid'
  )
);

ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_payment_reference_length;

ALTER TABLE public.orders
ADD CONSTRAINT orders_payment_reference_length
CHECK (
  payment_reference IS NULL
  OR char_length(payment_reference) <= 120
);

-- ============================================================
-- 4. PRIVATE PAYMENT-PROOF STORAGE
-- ============================================================

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
ON CONFLICT (id)
DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types =
    ARRAY[
      'image/png',
      'image/jpeg',
      'image/webp'
    ];

-- ============================================================
-- 5. PAYMENT-PROOF STORAGE POLICIES
-- ============================================================

-- Customers can upload files only into their own folder.

DROP POLICY IF EXISTS
  "Payment proofs upload own"
ON storage.objects;

CREATE POLICY "Payment proofs upload own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] =
    (SELECT auth.uid())::text
);

-- Customers can read their own uploaded files.
-- Authorized operators can also read payment proofs.

DROP POLICY IF EXISTS
  "Payment proofs read own or operator"
ON storage.objects;

CREATE POLICY "Payment proofs read own or operator"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (
    (storage.foldername(name))[1] =
      (SELECT auth.uid())::text
    OR (SELECT public.is_operator())
  )
);

-- ============================================================
-- 6. MANUAL ORDER PAYMENT FUNCTION
-- ============================================================

-- The existing place_order() function remains responsible
-- for calculating prices, checking stock, creating orders,
-- and providing duplicate-request protection.
--
-- This function adds payment method validation and
-- saves the initial payment status.
--
-- QR payments: pending_verification
-- COD payments: unpaid_cod

CREATE OR REPLACE FUNCTION public.place_manual_order(
  p_items jsonb,
  p_delivery_date date,
  p_delivery_address text,
  p_note text,
  p_request_id uuid,
  p_payment_method text,
  p_payment_reference text DEFAULT NULL,
  p_payment_proof_path text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := (SELECT auth.uid());

  v_id uuid;

  v_reference text := NULLIF(
    btrim(COALESCE(p_payment_reference, '')),
    ''
  );

  v_proof text := NULLIF(
    btrim(COALESCE(p_payment_proof_path, '')),
    ''
  );

  v_existing_method text;

BEGIN

  -- ==========================================================
  -- 6.1 REQUIRE AUTHENTICATION
  -- ==========================================================

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'KP_AUTH_REQUIRED';
  END IF;

  -- ==========================================================
  -- 6.2 VALIDATE PAYMENT METHOD
  -- ==========================================================

  IF p_request_id IS NULL
     OR p_payment_method IS NULL
     OR p_payment_method NOT IN (
       'gcash',
       'maya',
       'gotyme',
       'cod'
     )
  THEN
    RAISE EXCEPTION 'KP_INVALID_ORDER'
      USING DETAIL = 'Choose a valid payment method.';
  END IF;

  -- ==========================================================
  -- 6.3 VALIDATE TRANSACTION REFERENCE
  -- ==========================================================

  IF v_reference IS NOT NULL
     AND char_length(v_reference) > 120
  THEN
    RAISE EXCEPTION 'KP_INVALID_ORDER'
      USING DETAIL =
        'Shorten your transaction reference.';
  END IF;

  -- ==========================================================
  -- 6.4 CASH ON DELIVERY VALIDATION
  -- ==========================================================

  IF p_payment_method = 'cod' THEN

    IF v_reference IS NOT NULL
       OR v_proof IS NOT NULL
    THEN
      RAISE EXCEPTION 'KP_INVALID_ORDER'
        USING DETAIL =
          'COD does not use payment proof.';
    END IF;

  -- ==========================================================
  -- 6.5 QR PAYMENT VALIDATION
  -- ==========================================================

  ELSIF v_reference IS NULL
        AND v_proof IS NULL
  THEN
    RAISE EXCEPTION 'KP_INVALID_ORDER'
      USING DETAIL =
        'Provide a transaction reference or proof.';
  END IF;

  -- ==========================================================
  -- 6.6 VERIFY PAYMENT PROOF OWNERSHIP
  -- ==========================================================

  -- Payment proof must:
  -- 1. Match the expected file path format.
  -- 2. Exist in the payment-proofs storage bucket.
  -- 3. Belong to the authenticated customer's folder.

  IF v_proof IS NOT NULL AND (
    v_proof !~ (
      '^' || v_user::text ||
      '/[0-9a-f-]{36}[.](png|jpg|webp)$'
    )
    OR NOT EXISTS (
      SELECT 1
      FROM storage.objects
      WHERE bucket_id = 'payment-proofs'
        AND name = v_proof
        AND (storage.foldername(name))[1] =
          v_user::text
    )
  ) THEN

    RAISE EXCEPTION 'KP_INVALID_ORDER'
      USING DETAIL =
        'Payment proof is not valid.';

  END IF;

  -- ==========================================================
  -- 6.7 CREATE ORDER USING EXISTING ORDER FUNCTION
  -- ==========================================================

  v_id := public.place_order(
    p_items,
    p_delivery_date,
    p_delivery_address,
    p_note,
    p_request_id
  );

  -- ==========================================================
  -- 6.8 PROTECT EXISTING PAYMENT METHOD
  -- ==========================================================

  SELECT payment_method
  INTO v_existing_method
  FROM public.orders
  WHERE id = v_id
    AND customer_id = v_user
  FOR UPDATE;

  IF v_existing_method IS NOT NULL
     AND v_existing_method <> p_payment_method
  THEN
    RAISE EXCEPTION 'KP_INVALID_ORDER'
      USING DETAIL =
        'This request already used another payment method.';
  END IF;

  -- ==========================================================
  -- 6.9 SAVE PAYMENT INFORMATION
  -- ==========================================================

  UPDATE public.orders
  SET
    payment_method = COALESCE(
      payment_method,
      p_payment_method
    ),

    payment_status = COALESCE(
      payment_status,
      CASE
        WHEN p_payment_method = 'cod'
          THEN 'unpaid_cod'
        ELSE 'pending_verification'
      END
    ),

    payment_reference = COALESCE(
      payment_reference,
      v_reference
    ),

    payment_proof_path = COALESCE(
      payment_proof_path,
      v_proof
    )

  WHERE id = v_id
    AND customer_id = v_user;

  RETURN v_id;

END;
$$;

-- ============================================================
-- 7. FUNCTION PERMISSIONS
-- ============================================================

REVOKE ALL
ON FUNCTION public.place_manual_order(
  jsonb,
  date,
  text,
  text,
  uuid,
  text,
  text,
  text
)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.place_manual_order(
  jsonb,
  date,
  text,
  text,
  uuid,
  text,
  text,
  text
)
TO authenticated;

-- ============================================================
-- 8. COMPLETE MIGRATION
-- ============================================================

COMMIT;
