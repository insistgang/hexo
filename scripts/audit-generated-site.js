const fs = require('node:fs');
const path = require('node:path');

const FALLBACK_PATTERN = /(?:^|\/)(?:404|error-page|friend_404)(?:\.|$)/i;
const IMAGE_EXTENSIONS = new Set(['gif', 'jpg', 'png', 'svg', 'webp']);

function walkFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(dir, entry.name);
    return entry.isDirectory() ? walkFiles(target) : [target];
  });
}

function detectImageType(file) {
  const data = fs.readFileSync(file);
  if (
    data.length >= 8
    && data.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    )
  ) return 'png';
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'jpg';
  if (
    data.length >= 6
    && ['GIF87a', 'GIF89a'].includes(data.subarray(0, 6).toString('ascii'))
  ) return 'gif';
  if (
    data.length >= 12
    && data.subarray(0, 4).toString('ascii') === 'RIFF'
    && data.subarray(8, 12).toString('ascii') === 'WEBP'
  ) return 'webp';
  if (data.subarray(0, 512).toString('utf8').match(/<svg\b/i)) return 'svg';
  return null;
}

function decodePath(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function auditSite(publicDir) {
  const root = path.resolve(publicDir);
  if (!fs.existsSync(root)) throw new Error(`Generated site not found: ${root}`);

  const files = walkFiles(root);
  const htmlFiles = files.filter((file) => file.endsWith('.html'));
  const references = new Map();
  const actualFallbackRefs = [];

  for (const htmlFile of htmlFiles) {
    const html = fs.readFileSync(htmlFile, 'utf8');
    for (const tag of html.matchAll(/<(?:img|source|video)\b[^>]*>/gi)) {
      const attributes = /(?:^|\s)(?:src|poster)=["']([^"']+)["']|(?:^|\s)srcset=["']([^"']+)["']/gi;
      for (const match of tag[0].matchAll(attributes)) {
        const values = match[2]
          ? match[2].split(',').map((item) => item.trim().split(/\s+/)[0])
          : [match[1]];

        for (const rawValue of values) {
          if (
            !rawValue
            || /^(?:https?:)?\/\//i.test(rawValue)
            || /^(?:data:|blob:|javascript:|#)/i.test(rawValue)
          ) continue;

          const cleanValue = decodePath(rawValue.split(/[?#]/)[0]);
          const resolved = cleanValue.startsWith('/')
            ? path.join(root, cleanValue.replace(/^\/+/, ''))
            : path.resolve(path.dirname(htmlFile), cleanValue);
          const page = path.relative(root, htmlFile).split(path.sep).join('/');

          if (!references.has(resolved)) references.set(resolved, new Set());
          references.get(resolved).add(page);
          if (FALLBACK_PATTERN.test(cleanValue)) {
            actualFallbackRefs.push({ asset: cleanValue, page });
          }
        }
      }
    }
  }

  const missingAssets = [...references]
    .filter(([file]) => !fs.existsSync(file))
    .map(([file, pages]) => ({
      asset: path.relative(root, file).split(path.sep).join('/'),
      pages: [...pages].sort(),
    }))
    .sort((left, right) => left.asset.localeCompare(right.asset));

  const extensionMismatches = files
    .map((file) => {
      const extension = path.extname(file).toLowerCase().slice(1).replace('jpeg', 'jpg');
      if (!IMAGE_EXTENSIONS.has(extension)) return null;
      const actual = detectImageType(file);
      if (!actual || actual === extension) return null;
      return {
        asset: path.relative(root, file).split(path.sep).join('/'),
        extension,
        actual,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.asset.localeCompare(right.asset));

  const postsDir = path.join(root, 'posts');
  const publicPosts = fs.existsSync(postsDir)
    ? fs.readdirSync(postsDir).filter((name) => name.endsWith('.html')).length
    : 0;

  return {
    htmlFiles: htmlFiles.length,
    publicPosts,
    uniqueLocalAssetRefs: references.size,
    missingAssets,
    extensionMismatches,
    actualFallbackRefs,
  };
}

function main() {
  const publicDir = process.argv[2] || path.resolve(__dirname, '..', 'public');
  const result = auditSite(publicDir);
  const failed = result.missingAssets.length > 0
    || result.extensionMismatches.length > 0
    || result.actualFallbackRefs.length > 0;

  console.log(JSON.stringify(result, null, 2));
  if (failed) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { auditSite, detectImageType };
