var express = require('express');
var router = express.Router();
const user_projectsController = require('../controllers').user_projectsController;

router.get('/',user_projectsController.list);
router.get('/:id',user_projectsController.getById);
router.post('/',user_projectsController.add);
router.put('/:id',user_projectsController.update);
router.delete('/:id',user_projectsController.delete);


module.exports = router;