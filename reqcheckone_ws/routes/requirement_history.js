var express = require('express');
var router = express.Router();
const requirement_historyController = require('../controllers').requirement_historyController;

router.get('/', requirement_historyController.list);
router.get('/:id', requirement_historyController.getById);
router.post('/', requirement_historyController.add);
router.put('/:id', requirement_historyController.update);
router.delete('/:id', requirement_historyController.delete);

module.exports = router;