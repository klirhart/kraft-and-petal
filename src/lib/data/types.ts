import type {
  Category,
  Credentials,
  Order,
  OrderStatus,
  PlaceOrderInput,
  Product,
  ProductFilter,
  ProductInput,
  SampleAccount,
  Session,
  SignUpInput,
  SignUpResult,
} from '@/types'

export type DataMode = 'sample' | 'supabase'

/**
 * The contract every backend implements. Screens only ever talk to this, so
 * swapping Supabase for something else means writing one new implementation.
 *
 * Every method rejects with a `DataError`. Permission rules are enforced by
 * the backend itself (database policies for Supabase, the same checks in the
 * sample backend); client guards are a convenience, never the protection.
 */
export interface DataSource {
  auth: {
    getSession(): Promise<Session | null>
    /** Calls the listener on sign in, sign out and profile changes. Returns unsubscribe. */
    onSessionChange(listener: (session: Session | null) => void): () => void
    signIn(credentials: Credentials): Promise<Session>
    signUp(input: SignUpInput): Promise<SignUpResult>
    signOut(): Promise<void>
    /** Ready-made accounts for trying the app. Empty unless running on sample data. */
    listSampleAccounts(): Promise<SampleAccount[]>
  }
  catalog: {
    listCategories(): Promise<Category[]>
    /** Active products only. */
    listProducts(filter?: ProductFilter): Promise<Product[]>
    /** Resolves null when there is no active product with that slug. */
    getProductBySlug(slug: string): Promise<Product | null>
    getProductsByIds(ids: string[]): Promise<Product[]>
  }
  orders: {
    /** Prices, totals and stock are worked out by the backend, not the caller. */
    place(input: PlaceOrderInput): Promise<Order>
    uploadPaymentProof(file: File, requestId: string): Promise<string>
    listMine(): Promise<Order[]>
  }
  /** Operator only. */
  admin: {
    /** Every product, hidden ones included. */
    listProducts(): Promise<Product[]>
    createProduct(input: ProductInput): Promise<Product>
    updateProduct(id: string, input: ProductInput): Promise<Product>
    setProductActive(id: string, isActive: boolean): Promise<void>
    setProductStock(id: string, stock: number): Promise<void>
    deleteProduct(id: string): Promise<void>
    /** Stores a picture and resolves its storage path. Rejects where uploads are not supported. */
    uploadProductImage(file: File): Promise<string>
    listOrders(): Promise<Order[]>
    updateOrderStatus(id: string, status: OrderStatus): Promise<void>
  }
}
