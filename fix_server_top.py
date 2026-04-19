import re

with open('server.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the line numbers of things to remove
# 1. Remove the block: "await pool.query(`" ... ");" for the main schema (top level)
# 2. Remove the try { await pool.query(`...`); } catch block for admin_staff
# 3. Remove the top-level "await pool.query(`" for transactions

in_remove_block = False
remove_start = None
result = []
i = 0
skip_until = None

while i < len(lines):
    line = lines[i]
    stripped = line.strip()

    # Skip lines if we have a skip_until marker
    if skip_until is not None:
        if skip_until in line:
            skip_until = None
        i += 1
        continue

    # Detect the main top-level schema block (starts with "await pool.query(`")
    if stripped == 'await pool.query(`' and not in_remove_block:
        # Check if this is the big schema block (contains CREATE TABLE IF NOT EXISTS users)
        # Look ahead a few lines
        lookahead = ''.join(lines[i:i+5])
        if 'CREATE TABLE IF NOT EXISTS users' in lookahead:
            # Skip until we find the closing `);
            in_remove_block = True
            i += 1
            continue
        # Or if it's the transactions table
        elif 'CREATE TABLE IF NOT EXISTS transactions' in lookahead:
            in_remove_block = True
            i += 1
            continue

    # Inside a remove block, look for `);
    if in_remove_block:
        if stripped == '`);':
            in_remove_block = False
        i += 1
        continue

    # Remove the admin_staff try block
    if stripped == "// ── Admin Staff tables (migration safe) ───────────────────":
        # Skip this comment and the try block that follows
        # Skip until we find: `); } catch(e){ ... }
        i += 1
        while i < len(lines):
            if '`); } catch(e){' in lines[i]:
                i += 1
                break
            i += 1
        continue

    result.append(line)
    i += 1

with open('server.js', 'w', encoding='utf-8') as f:
    f.writelines(result)

print(f'Done. Original: {len(lines)} lines, Result: {len(result)} lines, Removed: {len(lines)-len(result)} lines')
