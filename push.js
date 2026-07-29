const { execSync } = require('child_process');

try {
  console.log("Adding changes...");
  execSync('git add .', { stdio: 'inherit' });
  
  console.log("Committing changes...");
  execSync('git commit -m "Fix numbering sequence and allow historical duplicates in bulk upload"', { stdio: 'inherit' });
  
  console.log("Pushing to GitHub...");
  execSync('git push', { stdio: 'inherit' });
  
  console.log("Successfully pushed to GitHub!");
} catch (error) {
  console.error("Error executing Git commands:");
}
