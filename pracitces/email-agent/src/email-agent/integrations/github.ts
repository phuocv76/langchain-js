// Libs for third party
import { Octokit } from "@octokit/rest";

let octokitClient: Octokit | undefined;

/** Returns a lazily constructed GitHub REST client. */
const getOctokit = (): Octokit => {
  if (octokitClient) {
    return octokitClient;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("Set GITHUB_TOKEN in .env before filing GitHub issues.");
  }

  octokitClient = new Octokit({ auth: token });
  return octokitClient;
};

/** Parses `owner/repo` from `GITHUB_REPO`. */
const getRepo = (): { owner: string; repo: string } => {
  const raw = process.env.GITHUB_REPO;
  if (!raw?.includes("/")) {
    throw new Error('Set GITHUB_REPO in "owner/repo" form.');
  }

  const [owner, repo] = raw.split("/");
  return { owner, repo };
};

/**
 * Creates a GitHub issue for a reported bug email.
 *
 * @param params - Issue title and body.
 * @returns Issue number and URL.
 */
export const createBugIssue = async (params: {
  readonly title: string;
  readonly body: string;
}): Promise<{ number: number; url: string }> => {
  const octokit = getOctokit();
  const { owner, repo } = getRepo();

  const response = await octokit.issues.create({
    owner,
    repo,
    title: params.title,
    body: params.body,
    labels: ["bug", "email-agent"],
  });

  return {
    number: response.data.number,
    url: response.data.html_url,
  };
};
