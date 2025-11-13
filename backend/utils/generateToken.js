import jwt from 'jsonwebtoken';

const generateToken = (id, email) => {

    const secret = process.env.JWT_SECRET;

    return jwt.sign({
        id,
        email
    }, secret, {
        expiresIn: '1d',
    });
};

export default generateToken;