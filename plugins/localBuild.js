/**
 * True when prebuild runs for a build on this machine (set by the local build npm scripts).
 * EAS cloud builders have more cores, so CPU/RAM throttling only applies locally.
 */
function isLocalBuild() {
  return process.env.LOCAL_BUILD === '1';
}

module.exports = { isLocalBuild };
