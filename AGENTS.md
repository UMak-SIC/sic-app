# Pull Request Templates

Before creating or editing a pull request, read `.github/PULL_REQUEST_TEMPLATE.md`
from the intended base branch and use every template section. Mark checkboxes only
for verification actually performed; use `Related issue: #<number>` rather than a
closing keyword when the pull request targets `dev`.

# Pull Request Issue Links

Feature pull requests target `dev`, not the repository's default branch. GitHub
ignores `Closes #<issue>` and similar closing keywords on non-default-base pull
requests, so those keywords neither close nor link the issue.

After creating a feature pull request, manually link its issue in GitHub:

1. Open the pull request.
2. In the right sidebar, open **Development**.
3. Select the related issue and apply the link.

This populates the Project's read-only **Linked pull requests** field. The `gh
pr create` and `gh pr edit` commands do not have a flag for this manual issue
link; `--project` only adds the pull request itself to a Project.
