const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');
const RoleModel = require('../models/role.model');
const config = require('../config');

class AuthService {
  static generateToken(user) {
    const payload = {
      userId: user.id,
      roles: Array.isArray(user.roles) ? user.roles : []
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });
  }

  static async register({ name, email, password }) {
    if (!name || !email || !password) {
      const err = new Error('Name, email, and password are required');
      err.statusCode = 400;
      throw err;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await UserModel.findByEmail(normalizedEmail);
    if (existingUser) {
      const err = new Error('A user with this email already exists');
      err.statusCode = 409;
      throw err;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await UserModel.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash
    });

    // Assign default role GRANTEE
    let granteeRole = await RoleModel.findByName('GRANTEE');
    if (!granteeRole) {
      granteeRole = await RoleModel.create('GRANTEE');
    }
    await UserModel.assignRole(newUser.id, granteeRole.id);

    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      roles: ['GRANTEE'],
      createdAt: newUser.created_at
    };
  }

  static async login({ email, password }) {
    if (!email || !password) {
      const err = new Error('Email and password are required');
      err.statusCode = 400;
      throw err;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await UserModel.findWithRolesByEmail(normalizedEmail);
    if (!user || !user.password_hash) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    const accessToken = this.generateToken(user);
    return { accessToken };
  }
}

module.exports = AuthService;
