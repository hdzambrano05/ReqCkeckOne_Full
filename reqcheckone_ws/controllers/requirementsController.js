const axios = require("axios");
const requirements = require('../models').requirements_model;
const projects = require('../models').projects_model;
const users = require('../models').users_model;
const comments = require('../models').comments_model;


module.exports = {

    list(req, res) {
        return requirements
            .findAll({})
            .then((requirement) => res.status(200).send(requirement))
            .catch((error) => { res.status(400).send(error); });
    },

    listfull(req, res) {
        return requirements.findAll({
            include: [
                {
                    model: projects,
                },
                {
                    attributes: ['username'],
                    model: users,
                },
            ]
        })
            .then(requirements => res.status(200).send(requirements))
            .catch(error => res.status(400).send(error));
    },

    async listByProject(req, res) {
        try {
            const { projectId } = req.params;
            const requirementsList = await requirements.findAll({
                where: { project_id: projectId },
                order: [['created_at', 'DESC']]
            });
            return res.status(200).send(requirementsList);
        } catch (error) {
            console.error(error);
            return res.status(400).send(error);
        }
    },

    getById(req, res) {
        return requirements
            .findByPk(req.params.id)
            .then((requirement) => {
                if (!requirement) {
                    return res.status(404).send({ message: 'Requirement Not Found' });
                }

                let parsedAnalysis = null;
                try {
                    parsedAnalysis = JSON.parse(requirement.analysis);
                } catch {
                    parsedAnalysis = requirement.analysis; // Si ya es objeto
                }

                return res.status(200).send({
                    ...requirement.toJSON(),
                    analysis: parsedAnalysis
                });
            })
            .catch((error) => res.status(400).send(error));
    },

    async analyze(req, res) {
        try {
            console.log("Petición recibida en Node.js:", req.body);

            // Generar un ID temporal si no viene del frontend
            const requirement = {
                id: req.body.id && req.body.id.trim().length > 0 ? req.body.id : `TEMP-${Date.now()}`,
                project_id: Number(req.body.project_id),
                text: req.body.text,
                context: req.body.context || ""
            };

            const response = await axios.post(
                "http://127.0.0.1:8000/analyze",
                requirement,
                { headers: { "Content-Type": "application/json" } }
            );

            console.log("Respuesta de FastAPI:", response.data);
            res.status(200).send(response.data);

        } catch (error) {
            console.error("Error en analyze Node.js:", error.message);

            if (error.response) {
                console.error("Status FastAPI:", error.response.status);
                console.error("Data FastAPI:", error.response.data);
                return res.status(error.response.status).send(error.response.data);
            }

            res.status(500).send({ error: "Error al analizar el requisito" });
        }
    },


    add(req, res) {
        const payload = {
            project_id: req.body.project_id,
            title: req.body.title,
            text: req.body.text,
            context: req.body.context,
            status: req.body.status || 'draft',
            priority: req.body.priority || 'medium',
            due_date: req.body.due_date,
            version: req.body.version || 1,
            analysis: JSON.stringify(req.body.analysis), // viene del frontend
            created_by: req.body.created_by
        };

        requirements.create(payload)
            .then(saved => res.status(201).send(saved))
            .catch(error => res.status(400).send(error));
    },


    update(req, res) {
        return requirements
            .findByPk(req.params.id)
            .then(requirements => {
                if (!requirements) {
                    return res.status(404).send({
                        message: 'Requirement Not Found',
                    });
                }
                return requirements
                    .update({
                        project_id: req.body.project_id || requirements.project_id,
                        title: req.body.title || requirements.title,
                        text: req.body.text || requirements.text,
                        context: req.body.context || requirements.context,
                        status: req.body.status || requirements.status,
                        priority: req.body.priority || requirements.priority,
                        due_date: req.body.due_date || requirements.due_date,
                        version: req.body.version || requirements.version,
                        analysis: req.body.analysis || requirements.analysis,
                        created_by: req.body.created_by || requirements.created_by,
                    })
                    .then(() => res.status(200).send(requirements))
                    .catch((error) => res.status(400).send(error));
            })
            .catch((error) => res.status(400).send(error));
    },

    delete(req, res) {
        return requirements
            .findByPk(req.params.id)
            .then(requirements => {
                if (!requirements) {
                    return res.status(404).send({
                        message: 'Requirement Not Found',
                    });
                }
                return requirements
                    .destroy()
                    .then(() => res.status(204).send())
                    .catch((error) => res.status(400).send(error));
            })
            .catch((error) => res.status(400).send(error));
    }
};