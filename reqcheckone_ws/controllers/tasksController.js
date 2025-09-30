//const { get } = require('../routes/tasks');

const tasks = require('../models').tasks_model;

module.exports = {

    list(req, res) {
        return tasks
            .findAll({})
            .then((tasks) => res.status(200).send(tasks))
            .catch((error) => { res.status(400).send(error); });
    },

    getById(req, res) {

        console.log(req.params.id);
        return tasks
            .findByPk(req.params.id)
            .then((tasks) => {
                console.log(tasks);
                if (!tasks) {
                    return res.status(404).send({
                        message: 'tasks Not Found',
                    });
                }
                return res.status(200).send(tasks);
            })
            .catch((error) =>
                res.status(400).send(error));
    },

    add(req, res) {
        return tasks
            .create({
                project_id: req.body.project_id,
                requirement_id: req.body.requirement_id,
                title: req.body.title,
                description: req.body.description,
                status: req.body.status,
                priority: req.body.priority,
                assignee_id: req.body.assignee_id,
                assigned_to: req.body.assigned_to,            
                due_date: req.body.due_date,               
            })
            .then((tasks) => res.status(201).send(tasks))
            .catch((error) => res.status(400).send(error));
    },
    update(req, res) {
        return tasks
            .findByPk(req.params.id)
            .then(tasks => {
                if (!tasks) {
                    return res.status(404).send({
                        message: 'tasks Not Found',
                    });
                }
                return tasks
                    .update({
                        project_id: req.body.project_id || tasks.project_id,
                        requirement_id: req.body.requirement_id || tasks.requirement_id,
                        title: req.body.title || tasks.title,
                        description: req.body.description || tasks.description,
                        status: req.body.status || tasks.status,
                        priority: req.body.priority || tasks.priority,
                        assignee_id: req.body.assignee_id || tasks.assignee_id,
                        assigned_to: req.body.assigned_to || tasks.assigned_to,                        
                        due_date: req.body.due_date || tasks.due_date,
                    })
                    .then(() => res.status(200).send(tasks))
                    .catch((error) => res.status(400).send(error));
            } 
            )
            .catch((error) => res.status(400).send(error));
    },  

    delete(req, res) {
        return tasks
            .findByPk(req.params.id)
            .then(tasks => {
                if (!tasks) {
                    return res.status(404).send({
                        message: 'tasks Not Found',
                    });
                }
                return tasks
                    .destroy()
                    .then(() => res.status(204).send())
                    .catch((error) => res.status(400).send(error));
            })
            .catch((error) => res.status(400).send(error));
    },

}

