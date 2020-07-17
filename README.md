# clubhouse-importer
Migrate stories from one clubhouse.io workspace to a different workspace

Store your tokens, one for the source workspace and one for the target workspace in a `.env` file in the project directory.
```
CLUBHOUSE_API_TOKEN_SOURCE = "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
CLUBHOUSE_API_TOKEN_TARGET = "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
```

A manually configured Epic and Project in the target workspace are needed (currently hardcoded in index.js)


## Usage
The importer runs via command line. 

`cd` to the product directory and run via `node index.js <func>`

* `node index.js addIterations` to migrate the iterations from the sourc workspace
* `node index.js importOne <storyId>` to import a single story
* `node index.js importAll` to import all stories from the source workspace for a configured project id (currently hardcoded in index.js)
* `node index.js linkStories` to add any story "links" (Story YY is blocked by Story ZZ) after an import is run

