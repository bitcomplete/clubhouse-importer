# clubhouse-importer
Migrate stories from one clubhouse.io workspace to a different workspace

Store your tokens, one for the source workspace and one for the target workspace in a `.env` file in the project directory.
```
CLUBHOUSE_API_TOKEN_SOURCE = "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
CLUBHOUSE_API_TOKEN_TARGET = "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
```

## Requirements

* Before running, duplicate all users referenced in stories from the source workspace into the new target workspace. You can use the Org Dashboard for this: https://app.clubhouse.io/organizations/<org-name>/manage
* Create a target project (you'll need the ID below) and a target epic in the new workspace.


## Usage
The importer runs via command line. 

`cd` to the product directory and run via `node index.js <func> <args>`

Methods accept a "settings" object via `args` that should specify clubhouse.io entity *IDs* for the source project, target project, and target epic.



* `node index.js addIterations` to migrate the iterations from the source workspace
* `node index.js importOne --story <storyId> --target_project <projectId> --target_epic <epicId>` to import a single story
* `node index.js importAll --source_project <projectId> --target_project <projectId> --target_epic <epicId>` to import all stories from the source workspace for a source project id
* `node index.js linkStories --source_project <projectId>` to add any story "links" (Story YY is blocked by Story ZZ) after an import is run

