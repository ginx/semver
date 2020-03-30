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
  console.log("Debug")
  exec.exec("ls")

  try {
    let output = await get_git_tags();
    let versions = output
      .split('\n')
      .map(semver.parse)
      .filter(l => l != null);

    versions.sort(semver.compare);

    let version = versions.length ? versions[versions.length - 1] : semver.parse('0.0.0');

    console.log(version.version);

    const octokit = new github.GitHub(process.env.GITHUB_TOKEN);
    const context = github.context;

    const { major, minor, patch } = version;
    const { prereleaseName, prereleaseVersion } = version.prerelease;

    let request;

    core.debug(process.env)
    core.debug(context)
    core.debug(context.repo)

    request = await octokit.git.getRef({
      ...context.repo,
      ref: context.ref
    })

    let ref = request.data

    request = await octokit.git.getCommit({
      ...context.repo,
      commit_sha: ref.object.sha,
    });

    let commit = request.data

    core.debug(commit)

    // request = await octokit.git.createTag({
    //   ...context.repo,
    //   tag: 'v' + version.version,
    //   message: version.version,
    //   object: ref.object.sha,
    //   type: ref.object.type,
    // })

    // let tag = request.data

    // request = await octokit.git.createRef({
    //   owner: context.repo.owner,
    //   repo: context.repo.repo,
    //   ref: 'refs/tags/' + tag.tag,
    //   sha: tag.object.sha,
    // })

    // console.log(request.data)

    // console.log(context.ref)
    // console.log(context.repo)
    // console.log(context.payload)

    // console.log(semver.inc(version, 'major'))
    // console.log(semver.inc(version, 'minor'))
    // console.log(semver.inc(version, 'patch'))

    core.setOutput('version', major);
    core.setOutput('major', major);
    core.setOutput('minor', minor);
    core.setOutput('patch', patch);
    core.setOutput('preName', prereleaseName);
    core.setOutput('preVersion', prereleaseVersion);
    // console.log(version);
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

run()
