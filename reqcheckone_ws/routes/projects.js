var express = require('express');
var router = express.Router();
const projectsController = require('../controllers').projectsController;

router.get('/', projectsController.list);
router.get('/full', projectsController.listFull);
router.get('/:id', projectsController.getById);
router.post('/', projectsController.add);
router.put('/:id', projectsController.update);
router.delete('/:id', projectsController.delete);

module.exports = router;