const { withXcodeProject } = require('expo/config-plugins');

// Sentry generates unquoted command substitutions for script paths. Xcode then
// splits the resolved paths at spaces, before the scripts themselves can run.
function quoteScriptPaths(script) {
  return script.replace(/`([^`]+)`/g, (_match, command) => `"$(${command})"`);
}

function repairProject(project) {
  for (const name of ['Bundle React Native code and images', 'Upload Debug Symbols to Sentry']) {
    const phase = project.pbxItemByComment(name, 'PBXShellScriptBuildPhase');
    if (!phase || !phase.shellScript.includes('sentry-xcode')) continue;
    phase.shellScript = JSON.stringify(quoteScriptPaths(JSON.parse(phase.shellScript)));
  }
  return project;
}

// Register before Sentry: Xcode project mods execute in reverse registration order.
module.exports = function withIosScriptPaths(config) {
  return withXcodeProject(config, mod => {
    repairProject(mod.modResults);
    return mod;
  });
};
module.exports.quoteScriptPaths = quoteScriptPaths;
module.exports.repairProject = repairProject;
