dotenv = require('dotenv').config()
const ch = require('clubhouse-lib')

// API Clients per workspace
const source = ch.create(process.env.CLUBHOUSE_API_TOKEN_SOURCE); 
const target = ch.create(process.env.CLUBHOUSE_API_TOKEN_TARGET); 

// TODO: move to args
const targetEpic = 422
const targetProject = 423
const sourceProject = 102

const migratedPrefix = '[Migrated:'




const addStoryLinks = async () => {
    // Handle mapping for story links (x blocks y, etc)
    // This should run AFTER stories have been migrated.
    let storiesMap = {}
    let allStoryLinks = []
    let sourceStories = await source.listStories(sourceProject).then(stories => {
        stories.forEach(s => {
            s.story_links.forEach(link => {
                allStoryLinks.push({
                    archived: s.archived,
                    story_to_fix: s.id,
                    old_subject_id: link.subject_id,
                    verb: link.verb,
                    old_object_id: link.object_id,
                    created_at: link.created_id,
                    updated_at: link.updated_at,
                })
            })
            // parse out the new id from the old story name, add to the map.
            const newId = s.name.split(migratedPrefix).pop().split(']')[0]
            storiesMap[s.id] = newId
        })
        return stories
    })
    
    console.log(`Creating missing story links for ${allStoryLinks.length} stories`)
    for (let link of allStoryLinks) {
        let linkParam = {
            object_id: storiesMap[link.old_object_id],
            subject_id: storiesMap[link.old_subject_id],
            verb: link.verb,
            }
        console.log(linkParam.subject_id, linkParam.verb, linkParam.object_id)
        try {
            await target.createStoryLink(linkParam).then(console.log)
        } catch(err) {
            // Likely already imported.
            // console.log(err)
        }
        
    }
}


const createIterationsFromSource = async () => {
    await source.listIterations().then(iters => {
        iters.map(async iter => {
            const importIter = {
                "name": iter.name,
                "start_date": iter.start_date,
                "end_date": iter.end_date,
            }
            await target.createIteration(importIter).then(console.log)        
        })
    })
}



const importOne = async (storyId) => {
    const resourceMaps = await getResourceMaps()
    let newStory = await getStoryForImport(storyId, resourceMaps)
    await updateStory(newStory)
}


const importAll = async () => {
    await source.listProjects().then(projs => {
        projs.forEach(p => console.log(p.name))
    })
    
    const sourceStoryIds = await source.listStories(sourceProject).then(stories => {
        return stories.map(s => s.id)
    })
    console.log(sourceStoryIds)

    const resourceMaps = await getResourceMaps()
    
    let toImport = []
    for (let sid of sourceStoryIds) {
      let newStory = await getStoryForImport(sid, resourceMaps)
      toImport.push(newStory)
    }
    //toImport = toImport.slice(0, 10)
    console.log(toImport.length)

    for (let newStory of toImport) {
        await updateStory(newStory)
    }

}


const updateStory = async (newStory) => {
//    console.log(newStory)
    if (!newStory.create.name.startsWith(migratedPrefix)) {
        await target.createStory(newStory.create).then(async res => {
            console.log(`Created new story #${res.id}: ${res.name}`)
            console.log(` - - via old source story #${newStory.id}`)
            const origDescription = newStory.create.description || ''
            let updateSource = {
                name: `${migratedPrefix}${res.id}] ${newStory.create.name}`,
                description: `${origDescription}\n\n** Migrated to ${res.app_url} **`,
            }
            
            await source.updateStory(newStory.id, updateSource).then(console.log)
        })
    } else {
        console.log(`....We have already migrated this story... ~ ${newStory.create.name}`)
    }
}    



const getStoryForImport = async (sid, resourceMaps) => {
    const members = resourceMaps.members
    const iterations = resourceMaps.iterations
    const workflows = resourceMaps.workflows
    
    const s = await source.getStory(sid).then(sty => {
        console.log(`Fetched source story #${sty.id} - ${sty.name}`)
        return sty
    })
    
    let sourceComments = s.comments.map(c => {
        return {
            author_id: members[c.author_id],
            created_at: c.created_at,
            updated_at: c.updated_at,
            text: c.text,
        }
    })
    
    let sourceTasks = s.tasks.map(t => {
        return {
            // a task is "complete" not "completed" like stories.
            complete: t.complete,
            owner_ids: mapMembers(t.owner_ids, members),
            created_at: t.created_at,
            updated_at: t.updated_at,
            description: t.description,
        }
    })

    let newStory = {
        "archived": s.archived,
        "comments": sourceComments,
        "completed_at_override": s.created_at_override,
        "created_at": s.created_at,
        "deadline": s.deadline,
        "description": s.description,
        "epic_id": targetEpic,
        "estimate": s.estimate,
        "external_id": s.app_url,
        "follower_ids": mapMembers(s.follower_ids, members),
        "iteration_id": iterations[s.iteration_id],
        "name": s.name,
        "owner_ids": mapMembers(s.owner_ids, members),
        "project_id": targetProject,
        "requested_by_id": members[s.requested_by_id],
        "started_at_override": s.started_at_override,
        "story_type": s.story_type,
        "tasks": sourceTasks,
        "updated_at": s.updated_at,
        "workflow_state_id": workflows[s.workflow_state_id],
    }
    return {
        id: s.id,
        create: _cleanObj(newStory)
    }
}


const mapMembers = (oldMemberIds, membersMap) => {
    const memberIds =  []
    oldMemberIds.forEach(o_id => {
        const newId = membersMap[o_id]
        if (newId) {
            memberIds.push(newId)
        }
    })
    return memberIds
}


const _getMapObj = async (apiCall, keyField, innerArrayField) => {
    const sourceMapNameToId = {}
    await source[apiCall]().then(list => {
        list.forEach(i => {
            if (innerArrayField) {
                i[innerArrayField].forEach(inner => {
                    sourceMapNameToId[_resolve(keyField, inner)] = inner.id
                })
            } else {               
                sourceMapNameToId[_resolve(keyField, i)] = i.id
            }            
        })        
    })
    console.log(`...Temp map by ${keyField} for ${apiCall}`)
    console.log(sourceMapNameToId)

    const mapSourceToTargetIds = {}
    await target[apiCall]().then(list => {
        list.forEach(i => {
            if (innerArrayField) {
                i[innerArrayField].forEach(inner => {
                    const oldId = sourceMapNameToId[_resolve(keyField, inner)]
                    if (oldId) {
                        mapSourceToTargetIds[oldId] = inner.id
                    }
                })
            } else {
                const oldId = sourceMapNameToId[_resolve(keyField, i)]
                if (oldId) {
                    mapSourceToTargetIds[oldId] = i.id
                }
            }
        })
    })
    console.log(`...ID map for ${apiCall}`)
    console.log(mapSourceToTargetIds)
    return mapSourceToTargetIds
}


/* Create objects mapping old workspace ids to new workspace ids for
   member, iterataion, and workflow resources */
const getResourceMaps = async () => {

    const membersMap = await _getMapObj('listMembers', 'profile.email_address')
    const itersMap = await _getMapObj('listIterations', 'name')
    const wfMap = await _getMapObj('listWorkflows', 'name', 'states')

    return {
        members: membersMap,
        iterations: itersMap,
        workflows: wfMap,
    }
}

/* Utility to remove null and undefined values from an object */
const _cleanObj = (obj) => {
  var propNames = Object.getOwnPropertyNames(obj);
  for (var i = 0; i < propNames.length; i++) {
    var propName = propNames[i];
    if (obj[propName] === null || obj[propName] === undefined) {
      delete obj[propName];
    }
  }
  return obj
}


/* Utility to do a deep resolution of a nested object key */
const _resolve = (path, obj=self, separator='.') => {
    var properties = Array.isArray(path) ? path : path.split(separator)
    return properties.reduce((prev, curr) => prev && prev[curr], obj)
}


module.exports = {
    importAll: importAll,
    importOne: importOne,
    linkStories: addStoryLinks,
    addIterations: createIterationsFromSource,
}

require('make-runnable')
