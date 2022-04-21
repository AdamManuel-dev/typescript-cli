const shell = require('shelljs');

shell.config.silent = true;

async function run() {
  const packageJSONText = shell.cat('./package.json').stdout;
  const { dependencies } = JSON.parse(packageJSONText);
  const depNames = Object.entries(dependencies).map(([key, _value]) => key);
  const depCommunityTypes = depNames
    .map((name) => `@types/${name}`)
    .filter((typeDef) => !depNames.includes(typeDef));
  const total = depCommunityTypes.length;
  let successCount = 0;
  let failure = 0;
  depCommunityTypes.forEach((packageName) => {
    console.log(`installing: ${packageName}`);
    const success = shell.exec(`npm i -D ${packageName}`).code === 0;
    if (success) {
      console.log(` ✅ worked (${++successCount}/${total})`);
    } else {
      console.log(` 𝗫 failed (${++failure}/${total})`);
    }
  });
}

run();
