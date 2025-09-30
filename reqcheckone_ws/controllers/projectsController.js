const projects = require('../models').projects_model;
const users = require('../models').users_model;
const requirements = require('../models').requirements_model;
const tasks = require('../models').tasks_model;
const comments = require('../models').comments_model;


module.exports = {

    list(req, res) {
        return projects
            .findAll({})
            .then((project) => res.status(200).send(project))
            .catch((error) => { res.status(400).send(error); });
    },

    listFull(req, res) {
        return projects
            .findAll({
                include: [
                    {
                        model: users,
                    },
                    {
                        model: users,
                        as: 'collaboratedProjects',
                        through: {
                            attributes: ['role', 'joined_at'] // 👈 columnas de user_projects
                        }
                    },
                    {
                        model: requirements,
                    },
                    {
                        model: tasks,
                    },
                ]
            })
            .then(users => res.status(200).send(users))
            .catch(error => res.status(400).send(error));
    },


    getById(req, res) {
        return projects
            .findByPk(req.params.id)
            .then((project) => {
                if (!project) {
                    return res.status(404).send({
                        message: 'Project Not Found',
                    });
                }
                return res.status(200).send(project);
            })
            .catch((error) => res.status(400).send(error));
    },

    add(req, res) {
        return projects
            .create({
                name: req.body.name,
                description: req.body.description,
                owner_id: req.body.owner_id,
                status: req.body.status,
                deadline: req.body.deadline,
            })
            .then((project) => res.status(201).send(project))
            .catch((error) => res.status(400).send(error));
    },

    update(req, res) {
        return projects
            .findByPk(req.params.id)
            .then(projects => {
                if (!projects) {
                    return res.status(404).send({
                        message: 'Project Not Found',
                    });
                }
                return projects
                    .update({
                        name: req.body.name || projects.name,
                        description: req.body.description || projects.description,
                        owner_id: req.body.owner_id || projects.owner_id,
                        status: req.body.status || projects.status,
                        deadline: req.body.deadline || projects.deadline,
                    })
                    .then(() => res.status(200).send(projects))  // Send back the updated project.
                    .catch((error) => res.status(400).send(error));
            })
            .catch((error) => res.status(400).send(error));
    },

    delete(req, res) {
        return projects
            .findByPk(req.params.id)
            .then(projects => {
                if (!projects) {
                    return res.status(400).send({
                        message: 'Project Not Found',
                    });
                }
                return projects
                    .destroy()
                    .then(() => res.status(204).send())  // No content to send back.
                    .catch((error) => res.status(400).send(error));
            })
            .catch((error) => res.status(400).send(error));
    },

};
