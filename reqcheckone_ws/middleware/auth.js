const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).send({ message: 'No autorizado' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).send({ message: 'Token faltante' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).send({ message: 'Token inválido o expirado' });
        req.user = decoded;
        next();
    });
};
