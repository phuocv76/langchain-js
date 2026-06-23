import { Octokit } from "@octokit/rest";
import { requireEnv } from "../../lib/env.js";
import type { IssueRef } from "../types.js";

let cached: Octokit | undefined;

function getOctokit(): Octokit {
  if (!cached) cached = new Octokit({ auth: requireEnv("GITHUB_TOKEN") });
  return cached;
}

function repoParts(): { owner: string; repo: string } {
  const repo = requireEnv("GITHUB_REPO");
  const [owner, name] = repo.split("/");
  if (!owner || !name) {
    throw new Error(`GITHUB_REPO must be "owner/repo", got "${repo}".`);
  }
  return { owner, repo: name };
}

export interface CreateIssueInput {
  title: string;
  body: string;
  labels?: string[];
}

/** Create a GitHub issue and return a reference to it. */
export async function createIssue({ title, body, labels }: CreateIssueInput): Promise<IssueRef> {
  const octokit = getOctokit();
  const { owner, repo } = repoParts();

  const res = await octokit.issues.create({ owner, repo, title, body, labels });
  return {
    number: res.data.number,
    url: res.data.html_url,
    title: res.data.title,
  };
}

/** Search existing open issues by a free-text query (used to avoid duplicates). */
export async function findExistingIssue(query: string): Promise<IssueRef | null> {
  const octokit = getOctokit();
  const { owner, repo } = repoParts();

  const res = await octokit.search.issuesAndPullRequests({
    q: `repo:${owner}/${repo} is:issue is:open in:title ${query}`,
    per_page: 1,
  });

  const hit = res.data.items[0];
  if (!hit) return null;
  return { number: hit.number, url: hit.html_url, title: hit.title };
}
