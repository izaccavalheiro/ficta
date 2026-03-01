/**
 * Canonical column name → Ficta type hints.
 *
 * Used by ddl-parser.js, infer.js, and graphql-bridge.js.
 * Universal — zero Node.js or browser-specific dependencies.
 * @module name-hints
 */

/**
 * Ordered list of [pattern, fictaType] pairs.
 * Patterns are matched against lowercased column names in order.
 * The first match wins.
 */
export const NAME_HINTS = [
  // IDs
  [/^(id|_id|pk)$/i, 'autoIncrement'],
  [/uuid|guid/i, 'uuid'],

  // Person
  [/\bfirst_?name\b/i, 'firstName'],
  [/\blast_?name\b/i, 'lastName'],
  [/\bfull_?name\b|\bname\b/i, 'fullName'],
  [/\bjob_?title\b/i, 'jobTitle'],      // job_title / jobTitle only
  [/\btitle\b/i, 'sentence'],            // generic title → descriptive text
  [/\bprefix\b/i, 'prefix'],
  [/\bsuffix\b/i, 'suffix'],

  // Internet / auth
  [/\bemail\b/i, 'email'],
  [/\busername\b|\buser_?name\b/i, 'username'],
  [/\bpassword\b|\bpwd\b|\bhash\b/i, 'password'],
  [/\burl\b|\bwebsite\b|\bhomepage\b/i, 'url'],
  [/\bip(v4)?\b|\bip_?address\b/i, 'ipv4'],
  [/\buser_?agent\b/i, 'userAgent'],

  // Phone
  [/\bphone\b|\bmobile\b|\bfax\b|\btelephone\b/i, 'phone'],

  // Address
  [/\bstreet\b|\baddress1?\b/i, 'street'],
  [/\bcity\b|\btown\b/i, 'city'],
  [/\bstate\b|\bprovince\b|\bregion\b/i, 'state'],
  [/\bcountry\b/i, 'country'],
  [/\bzip\b|\bpostal_?code\b|\bpost_?code\b|\bpostal\b/i, 'zipCode'],
  [/\blat(itude)?\b/i, 'latitude'],
  [/\blo[ng]+itude?\b|\blng\b|\blon\b/i, 'longitude'],

  // Company
  [/\bcompany\b|\borganiz\b|\bfirm\b/i, 'company'],
  [/\bdep(art)?ment\b/i, 'department'],

  // Commerce / Finance
  [/\bprice\b|\bcost\b/i, 'price'],
  [/\bamount\b|\btotal\b|\bbalance\b/i, 'amount'],
  [/\biban\b/i, 'iban'],
  [/\bcard_?number\b|\bcredit_?card\b/i, 'creditCardNumber'],
  [/\baccount_?number\b|\baccount_?no\b/i, 'accountNumber'],
  [/\bcurrency\b|\bcurr\b/i, 'currency'],

  // Dates/time
  [/created_?at|registered|signup|joined/i, 'timestamp'],
  [/updated_?at|modified_?at|last_?updated/i, 'timestamp'],
  [/deleted_?at|archived_?at/i, 'timestamp'],
  [/\bbirthdate\b|\bbirth_?day\b|\bdob\b/i, 'pastDate'],
  [/\bexpires?(_?at|_?on|_?date)?\b/i, 'futureDate'],
  [/\bdate\b/i, 'pastDate'],
  [/\btimestamp\b|\btime\b/i, 'timestamp'],

  // Text
  [/\bdesc(ription)?\b|\bsummary\b|\bnotes?\b|\bcontent\b/i, 'sentence'],
  [/\bbio\b|\babout\b|\bdetails\b/i, 'paragraph'],

  // Boolean flags
  [/\bis_\w+|\bhas_\w+|\bactive\b|\benabled\b|\bflag\b/i, 'boolean'],

  // Colour
  [/\bcolou?r\b/i, 'color'],

  // JSON / metadata
  [/\bjson\b|\bmeta(data)?\b|\bconfig\b|\bsettings\b|\bproperties\b/i, 'json'],

  // Product
  [/\bproduct_?name\b|\bitem_?name\b/i, 'product'],
  [/\bproduct_?desc\b/i, 'productDescription'],

  // Generic fallbacks kept last
  [/\bslug\b|\bcode\b|\bkey\b|\btoken\b|\bref\b/i, 'word'],
];

/**
 * Look up a column name in the name-hints table.
 * @param {string} name - Column name to look up
 * @returns {string|null} Ficta type, or null if no hint matches
 */
export function lookupNameHint(name) {
  for (const [pattern, type] of NAME_HINTS) {
    if (pattern.test(name)) {
      return type;
    }
  }
  return null;
}
