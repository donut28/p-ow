import fs from 'fs';
import pngToIco from 'png-to-ico';

console.log('Generating icon.ico...');
try {
    const buf = await pngToIco('build/icon.png');
    fs.writeFileSync('build/icon.ico', buf);
    console.log('Successfully generated build/icon.ico');
} catch (e) {
    console.error(e);
    process.exit(1);
}
