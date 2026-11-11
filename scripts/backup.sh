#!/usr/bin/env bash
#
# Exports an encrypted backup of the Supabase database.
#
#   SUPABASE_DB_URL=...  BACKUP_PASSPHRASE=...  bash scripts/backup.sh [kind] [folder]
#
#   kind    weekly | monthly | manual   (default: manual; only names the file)
#   folder  where the encrypted file goes (default: ./backups, ignored by Git)
#
# What it writes: one file, kraft-petal-<kind>-<UTC date and time>.tar.gz.gpg,
# holding
#   schema.sql    tables, functions, grants and policies of the public schema
#   data.sql      every row of the public schema, plus the sign-in accounts
#                 (auth.users, auth.identities) that profiles and orders point to
#   manifest.txt  when, which versions, and a checksum of each file
#
# The dump holds customer names and addresses, so it never touches the disk
# unencrypted outside a private temporary folder, and that folder is removed
# when the script ends, however it ends.
#
# Both values are secrets. Pass them through the environment (your shell, or
# GitHub Actions secrets). Never put them in a file in this repository.
#
# Product pictures live in Supabase Storage and are NOT part of this file.
# README.md says how to copy them and how to restore.

set -euo pipefail
umask 077

fail() {
  echo "backup: $*" >&2
  exit 1
}

kind="${1:-manual}"
out_dir="${2:-backups}"

case "$kind" in
  weekly | monthly | manual) ;;
  *) fail "kind must be weekly, monthly or manual (got \"$kind\")" ;;
esac

[ -n "${SUPABASE_DB_URL:-}" ] || fail "SUPABASE_DB_URL is not set. Use the connection string from Supabase: Project settings > Database."
[ -n "${BACKUP_PASSPHRASE:-}" ] || fail "BACKUP_PASSPHRASE is not set. Without it the dump cannot be encrypted, so nothing was exported."
[ "${#BACKUP_PASSPHRASE}" -ge 20 ] || fail "BACKUP_PASSPHRASE is shorter than 20 characters. Use a long random passphrase."

pg_dump_bin="${PG_DUMP:-pg_dump}"
for tool in "$pg_dump_bin" gpg tar sha256sum; do
  command -v "$tool" >/dev/null 2>&1 || fail "\"$tool\" is not installed."
done

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
# gpg needs a home folder even for passphrase-only encryption. A throwaway one
# keeps this run away from any personal keyring.
export GNUPGHOME="$work/gnupg"
mkdir -p "$GNUPGHOME" "$work/dump"
export PGCONNECT_TIMEOUT="${PGCONNECT_TIMEOUT:-30}"

stamp="$(date -u +%Y-%m-%dT%H%M%SZ)"
name="kraft-petal-${kind}-${stamp}.tar.gz.gpg"

echo "backup: exporting the schema"
"$pg_dump_bin" --dbname="$SUPABASE_DB_URL" \
  --schema=public --schema-only --no-owner \
  --file="$work/dump/schema.sql"

echo "backup: exporting the data"
"$pg_dump_bin" --dbname="$SUPABASE_DB_URL" \
  --data-only --no-owner \
  --table='public.*' --table=auth.users --table=auth.identities \
  --file="$work/dump/data.sql"

# An export that "worked" but holds no shop tables is not a backup.
grep -q 'public\.orders' "$work/dump/schema.sql" || fail "schema.sql does not mention public.orders. Is this the right database?"
grep -q 'public\.products' "$work/dump/data.sql" || fail "data.sql holds no product rows. Is this the right database?"

(
  cd "$work/dump"
  {
    echo "Kraft & Petal database backup"
    echo "kind: $kind"
    echo "made: $stamp"
    echo "tool: $("$pg_dump_bin" --version)"
    echo
    sha256sum schema.sql data.sql
  } >manifest.txt
)

mkdir -p "$out_dir"
out="$out_dir/$name"

# The passphrase goes to gpg on file descriptor 3, not on the command line,
# so it does not show up in the process list.
echo "backup: encrypting"
tar -C "$work/dump" -czf - schema.sql data.sql manifest.txt |
  gpg --batch --yes --quiet --pinentry-mode loopback \
    --symmetric --cipher-algo AES256 \
    --passphrase-fd 3 --output "$out" 3<<<"$BACKUP_PASSPHRASE"

# Prove the file opens again with the same passphrase before calling it done.
listing="$(
  gpg --batch --quiet --pinentry-mode loopback --passphrase-fd 3 --decrypt "$out" 3<<<"$BACKUP_PASSPHRASE" |
    tar -tzf -
)" || {
  rm -f "$out"
  fail "the encrypted file could not be read back. It was removed."
}
for expected in schema.sql data.sql manifest.txt; do
  grep -qx "$expected" <<<"$listing" || {
    rm -f "$out"
    fail "the encrypted file is missing $expected. It was removed."
  }
done

size="$(wc -c <"$out" | tr -d ' ')"
echo "backup: wrote $out ($size bytes, encrypted)"
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "file=$out" >>"$GITHUB_OUTPUT"
fi
