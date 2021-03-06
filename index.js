const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');
const semver = require('semver');

async function get_git_tags(cwd) {
  let output = '';

  const options = {
    cwd: cwd || '.',
    silent: true
  };
  options.listeners = {
    stdout: (data) => {
      output += data.toString();
    },
    stderr: () => {
    }
  };

  await exec.exec('git', ['tag', '-l'], options);

  return output;
}

// most @actions toolkit packages have async methods
async function run() {
  try {
    let output = await get_git_tags();
    let versions = output
      .split('\n')
      .map(semver.parse)
      .filter(l => l != null);

    versions.sort(semver.compare);

    let version = semver.parse(versions.length ? versions[versions.length - 1].version : '0.0.0');

    console.log(version.version);

    const octokit = new github.GitHub(process.env.GITHUB_TOKEN);
    const context = github.context;

    const { major, minor, patch } = version;
    const { prereleaseName, prereleaseVersion } = version.prerelease;

    let request;

    if (context.payload.head_commit.message.indexOf("#major") != -1) {
      semver.inc(version, 'major')
    } else if (context.payload.head_commit.message.indexOf("#minor") != -1) {
      semver.inc(version, 'minor')
    } else if (context.payload.head_commit.message.indexOf("#patch") != -1) {
      semver.inc(version, 'patch')
    } else {
      semver.inc(version, 'prerelease', 'beta')
    }

    console.log(version.version);

    request = await octokit.git.createTag({
      ...context.repo,
      tag: 'v' + version.version,
      message: version.version,
      object: process.env.GITHUB_SHA,
      type: 'commit',
    })

    let tag = request.data

    request = await octokit.git.createRef({
      owner: context.repo.owner,
      repo: context.repo.repo,
      ref: 'refs/tags/' + tag.tag,
      sha: tag.object.sha,
    })

    core.setOutput('version', major);
    core.setOutput('major', major);
    core.setOutput('minor', minor);
    core.setOutput('patch', patch);
    core.setOutput('preName', prereleaseName);
    core.setOutput('preVersion', prereleaseVersion);
    // console.log(version);
  }
  catch (error) {
    console.log(error)
    core.setFailed(error.message);
  }
}

run()
