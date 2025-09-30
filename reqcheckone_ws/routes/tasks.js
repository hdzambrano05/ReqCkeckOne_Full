var express = require('express');
var router = express.Router();
const tasksController = require('../controllers').tasksController;

router.get('/',tasksController.list);
router.get('/:id', tasksController.getById);
router.post('/', tasksController.add);
router.put('/:id', tasksController.update);
router.delete('/:id', tasksController.delete);

module.exports = router;

