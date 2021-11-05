const basicAuth = require("express-basic-auth");
const passwordHash = require("./password-hash");
const { R } = require("redbean-node");
const { setting } = require("./util-server");
const { debug } = require("../src/util");
const { loginRateLimiter } = require("./rate-limiter");

/**
 *
 * @param username : string
 * @param password : string
 * @returns {Promise<Bean|null>}
 */
exports.login = async function (username, password) {
    let user = await R.findOne("user", " username = ? AND active = 1 ", [
        username,
    ]);

    if (user && passwordHash.verify(password, user.password)) {
        // Upgrade the hash to bcrypt
        if (passwordHash.needRehash(user.password)) {
            await R.exec("UPDATE `user` SET password = ? WHERE id = ? ", [
                passwordHash.generate(password),
                user.id,
            ]);
        }
        return user;
    }

    return null;
};

function myAuthorizer(username, password, callback) {
    setting("disableAuth").then((result) => {
        if (result) {
            callback(null, true);
        } else {
            // Login Rate Limit
            loginRateLimiter.pass(null, 0).then((pass) => {
                if (pass) {
                    exports.login(username, password).then((user) => {
                        callback(null, user != null);

                        if (user == null) {
                            loginRateLimiter.removeTokens(1);
                        }
                    });
                } else {
                    callback(null, false);
                }
            });

        }
    });
}

exports.basicAuth = basicAuth({
    authorizer: myAuthorizer,
    authorizeAsync: true,
    challenge: true,
});
