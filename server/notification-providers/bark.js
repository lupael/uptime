//
//  bark.js
//  UptimeKuma
//
//  Created by Lakr Aream on 2021/10/24.
//  Copyright © 2021 Lakr Aream. All rights reserved.
//

const NotificationProvider = require("./notification-provider");
const { DOWN, UP } = require("../../src/util");
const { default: axios } = require("axios");

// bark is an APN bridge that sends notifications to Apple devices.

const barkNotificationGroup = "UptimeKuma";
const barkNotificationAvatar = "https://github.com/louislam/uptime-kuma/raw/master/public/icon.png";
const barkNotificationSound = "telegraph";
const successMessage = "Successes!";

class Bark extends NotificationProvider {
    name = "Bark";

    async send(notification, msg, monitorJSON = null, heartbeatJSON = null) {
        try {
            var barkEndpoint = notification.barkEndpoint;

            // check if the endpoint has a "/" suffix, if so, delete it first
            if (barkEndpoint.endsWith("/")) {
                barkEndpoint = barkEndpoint.substring(0, barkEndpoint.length - 1);
            }

            if (msg != null && heartbeatJSON != null && heartbeatJSON["status"] == UP) {
                let title = "UptimeKuma Monitor Up";
                return await this.postNotification(title, msg, barkEndpoint);
            }

            if (msg != null && heartbeatJSON != null && heartbeatJSON["status"] == DOWN) {
                let title = "UptimeKuma Monitor Down";
                return await this.postNotification(title, msg, barkEndpoint);
            }

            if (msg != null) {
                let title = "UptimeKuma Message";
                return await this.postNotification(title, msg, barkEndpoint);
            }

        } catch (error) {
            throw error;
        }
    }

    // add additional parameter for better on device styles (iOS 15 optimized)
    appendAdditionalParameters(postUrl) {
        // grouping all our notifications
        postUrl += "?group=" + barkNotificationGroup;
        // set icon to uptime kuma icon, 11kb should be fine
        postUrl += "&icon=" + barkNotificationAvatar;
        // picked a sound, this should follow system's mute status when arrival
        postUrl += "&sound=" + barkNotificationSound;
        return postUrl;
    }

    // thrown if failed to check result, result code should be in range 2xx
    checkResult(result) {
        if (result.status == null) {
            throw new Error("Bark notification failed with invalid response!");
        }
        if (result.status < 200 || result.status >= 300) {
            throw new Error("Bark notification failed with status code " + result.status);
        }
    }

    async postNotification(title, subtitle, endpoint) {
        // url encode title and subtitle
        title = encodeURIComponent(title);
        subtitle = encodeURIComponent(subtitle);
        let postUrl = endpoint + "/" + title + "/" + subtitle;
        postUrl = this.appendAdditionalParameters(postUrl);
        let result = await axios.get(postUrl);
        this.checkResult(result);
        if (result.statusText != null) {
            return "Bark notification succeed: " + result.statusText;
        }
        // because returned in range 200 ..< 300
        return successMessage;
    }
}

module.exports = Bark;
