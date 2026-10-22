# Copies every table of one ClickHouse database to another over the HTTP interface.
# Needs only curl and sed (POSIX sh, also runs in the curlimages/curl image).
# Env: SRC_HTTP, SRC_AUTH (user:pass), SRC_DB, DST_HTTP, DST_AUTH, DST_DB.

ch() { curl -sS --fail-with-body -u "$1" --data-binary @- "$2/"; }

echo "CREATE DATABASE IF NOT EXISTS \`$DST_DB\`" | ch "$DST_AUTH" "$DST_HTTP" || exit 1

tables=$(echo "SELECT name FROM system.tables WHERE database = '$SRC_DB' AND NOT is_temporary AND engine NOT IN ('View', 'MaterializedView', 'LiveView', 'WindowView', 'Dictionary') AND name NOT LIKE '.inner%' ORDER BY name FORMAT TSVRaw" | ch "$SRC_AUTH" "$SRC_HTTP") || {
  echo "could not list tables in source database $SRC_DB" >&2
  exit 1
}

copied=0
failed=""
for t in $tables; do
  # Recreate the table in the target database. ClickHouse Cloud / clusters use
  # Shared*/Replicated* engines; a single Liara server needs the plain engine.
  if ! echo "SHOW CREATE TABLE \`$SRC_DB\`.\`$t\` FORMAT TSVRaw" | ch "$SRC_AUTH" "$SRC_HTTP" \
    | sed -E \
      -e "1s/^CREATE TABLE [^ (]+/CREATE TABLE IF NOT EXISTS \`$DST_DB\`.\`$t\`/" \
      -e "s/(Shared|Replicated)([A-Za-z]*MergeTree)\('[^']*', *'[^']*'(, *)?/\2(/" \
      -e "s/(Shared|Replicated)([A-Za-z]*MergeTree)( |$)/\2()\3/" \
    | ch "$DST_AUTH" "$DST_HTTP"; then
    failed="$failed $t"
    continue
  fi
  # Stream the rows in ClickHouse's binary Native format.
  if { printf 'INSERT INTO `%s`.`%s` FORMAT Native\n' "$DST_DB" "$t"; echo "SELECT * FROM \`$SRC_DB\`.\`$t\` FORMAT Native" | ch "$SRC_AUTH" "$SRC_HTTP"; } \
    | ch "$DST_AUTH" "$DST_HTTP"; then
    copied=$((copied + 1))
  else
    failed="$failed $t"
  fi
done

echo "tables copied: $copied"
if [ -n "$failed" ]; then
  echo "tables failed:$failed" >&2
  exit 1
fi
