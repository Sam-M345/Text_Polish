# ProjectClose.md

## End-of-Day Project Closure Protocol

### Protocol for Systematic Completion

To ensure no steps are overlooked, follow this structured approach:

1. **Remove all previous checkmarks** when starting this protocol for a new session
2. **Create a physical or digital checklist** of all required steps at the beginning
3. **Verbally acknowledge each step** before starting it
4. **Mark steps as complete** only after verifying all sub-tasks
5. **Follow the numbered sequence exactly** as presented below
6. **Verify all items are checked** before submitting the final report

### Required Steps

1. **Update File Tree** ✓

   - Verify @File_Tree 🌱.txt is complete and accurate (located at: `Guides/File_Tree 🌱🌴.txt`)
   - Ensure all new files are included
   - Confirm no files are missing or outdated
   - ✓ Mark when completed: **March 31, 2024**

2. **Refresh Documentation** ✓

   - Update @TDD📝.md with latest information (located at: `Guides/TDD📝.md`)
   - Review test coverage and implementation status
   - Validate all requirements are documented
   - ✓ Mark when completed: **March 31, 2024**

3. **Version Control** ✓

   - Commit changes with a descriptive but concise title (MAX: 26 characters)
   - Include relevant ticket/issue numbers if applicable
   - Ensure commit message reflects actual changes made
   - **Sync changes with remote repository using one of these commands:**

     ```
     # General Git sync command:
     git pull && git push

     # For Heroku deployments, use this specific command:
     git push heroku main
     ```

   - ✓ Mark when completed: **March 31, 2024**

4. **Deploy Changes** ✓

   - Sync repository to update online environment
   - Verify deployment completed successfully with:
     ```
     curl -I https://www.advisee.ai/
     ```
   - Confirm changes are visible on the website
   - **Clear Git Interface Status:**

     ```
     # First, check if there are pending changes or commits
     git status

     # If local branch is multiple commits ahead of remote:
     # Stage all changes (if any)
     git add -A

     # Commit any staged changes (if needed)
     git commit -m "Final sync commit"

     # Push ALL commits at once to sync completely
     git push heroku main --force

     # Update local reference to remote state
     git fetch heroku

     # Verify working tree is clean and branch is up to date
     git status
     ```

   - Ensure VS Code's Git interface shows no blue buttons (no changes to commit or sync)
   - ✓ Mark when completed: **March 31, 2024**

### Final Verification

✓ I have completed ALL of the steps above
✓ I have double-checked that no steps were skipped
✓ Date and time of completion: **March 31, 2024, 7:15 PM**
✓ Signature/Initials: **SA**

### Note

Complete this checklist before ending each work session to maintain project continuity and ensure your team has access to the latest changes. Skipping steps may result in incomplete documentation, deployment issues, or loss of work.
