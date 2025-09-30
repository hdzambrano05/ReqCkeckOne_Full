const { add, update } = require('./commentsController');

const user_projects = require('../models').user_projects_model;

module.exports = {

    list(req, res) {
        return user_projects
            .findAll({})
            .then((user_project) => res.status(200).send(user_project))
            .catch((error) => { res.status(400).send(error); });
    },

    getById(req, res) {
        console.log(req.params.id);
        return user_projects
            .findByPk(req.params.id)
            .then((user_projects) => {
                console.log(user_projects);
                if (!user_projects) {
                    return res.status(404).send({
                        message: 'user_projects Not Found',
                    });
                }
                return res.status(200).send(user_projects);
            })
            .catch((error) =>
                res.status(400).send(error));
    },

    add(req, res) {
        return user_projects
            .create({
                user_id: req.body.user_id,
                project_id: req.body.project_id,
                role: req.body.role,
            })
            .then((user_projects) => res.status(201).send(user_projects))
            .catch((error) => res.status(400).send(error));
    },

    update(req, res) {
        return user_projects
            .findByPk(req.params.id)
            .then(user_projects => {
                if (!user_projects) {
                    return res.status(404).send({
                        message: 'user_projects Not Found',
                    });
                }
                return user_projects
                    .update({
                        user_id: req.body.user_id || user_projects.user_id,
                        project_id: req.body.project_id || user_projects.project_id,
                        role: req.body.role || user_projects.role,

                    })
                    .then(() => res.status(200).send(user_projects))
                    .catch((error) => res.status(400).send(error));
            })
            .catch((error) => res.status(400).send(error));
    },
    delete(req, res) {
        return user_projects
            .findByPk(req.params.id)   
            .then(user_projects => {
                if (!user_projects) {
                    return res.status(404).send({
                        message: 'user_projects Not Found',
                    });
                }  
                return user_projects
                    .destroy()
                    .then(() => res.status(204).send())
                    .catch((error) => res.status(400).send(error));
            })
            .catch((error) => res.status(400).send(error));
    },

};