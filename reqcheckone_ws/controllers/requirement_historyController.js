//const { get } = require('../routes/requirements');

//const { version } = require('react');
//const { add } = require('./commentsController');
const { text } = require('express');
const { update } = require('./commentsController');

const requirement_history = require('../models').requirement_history_model;

module.exports = {

    list(req, res) {
        return requirement_history
            .findAll({})
            .then((requirement_history) => res.status(200).send(requirement_history))
            .catch((error) => { res.status(400).send(error); });
    },

    getById(req, res) {
        return requirement_history
            .findByPk(req.params.id)
            .then((requirement_history) => {
                if (!requirement_history) {
                    return res.status(404).send({
                        message: 'Requirement History Not Found',
                    });
                }
                return res.status(200).send(requirement_history);
            })
            .catch((error) => res.status(400).send(error));
    },

    add(req, res) {
        return requirement_history
            .create({
                requirement_id: req.body.requirement_id,
                version: req.body.version,
                text: req.body.text,
                context: req.body.context,
                analysis: req.body.analysis,
                changed_by: req.body.changed_by,

            })
            .then((requirement_history) => res.status(201).send(requirement_history))
            .catch((error) => res.status(400).send(error));
    },

    update(req, res) {
        return requirement_history
            .findByPk(req.params.id)
            .then(requirement_history => {
                if (!requirement_history) {
                    return res.status(404).send({
                        message: 'Requirement History Not Found',
                    });
                }
                return requirement_history
                    .update({
                        requirement_id: req.body.requirement_id || requirement_history.requirement_id,
                        version: req.body.version || requirement_history.version,
                        text: req.body.text || requirement_history.text,
                        context: req.body.context || requirement_history.context,
                        analysis: req.body.analysis || requirement_history.analysis,
                        changed_by: req.body.changed_by || requirement_history.changed_by,
                    })
                    .then(() => res.status(200).send(requirement_history))  // Send back the updated requirement_history.
                    .catch((error) => res.status(400).send(error));
            })
            .catch((error) => res.status(400).send(error));
    },

    delete(req, res) {
        return requirement_history
            .findByPk(req.params.id)
            .then(requirement_history => {
                if (!requirement_history) {
                    return res.status(404).send({
                        message: 'Requirement History Not Found',
                    });
                }
                return requirement_history
                    .destroy()
                    .then(() => res.status(204).send()) // Send back a 204 No Content status
                    .catch((error) => res.status(400).send(error));
            })
            .catch((error) => res.status(400).send(error));
    },
};