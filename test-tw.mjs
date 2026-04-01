import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import { readFileSync, writeFileSync } from 'fs';

const css = readFileSync('src/app/globals.css', 'utf-8');
try {
  const result = await postcss([tailwindcss]).process(css, { from: 'src/app/globals.css' });
  writeFileSync('/tmp/tw-test.css', result.css);
  console.log('SUCCESS');
  console.log('Output size:', result.css.length, 'bytes');
  console.log('Has .flex:', result.css.includes('.flex'));
  console.log('Has .bg-white:', result.css.includes('.bg-white'));
} catch (err) {
  console.error('ERROR:', err.message);
}
