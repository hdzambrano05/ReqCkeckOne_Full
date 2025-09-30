var express = require('express');
var router = express.Router();
const requirementsController = require('../controllers').requirementsController;

router.get('/', requirementsController.list);
router.get('/full', requirementsController.listfull);
router.get('/:id', requirementsController.getById);
router.post('/', requirementsController.add);
router.put('/:id', requirementsController.update);
router.delete('/:id', requirementsController.delete);

module.exports = router;    