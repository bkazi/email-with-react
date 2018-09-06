"use strict";

import "@babel/polyfill";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { extractCritical } from "emotion-server";
import { renderFile } from "ejs";
import {
  createTestAccount,
  createTransport,
  getTestMessageUrl
} from "nodemailer";
import { send, sendError } from "micro";
import { promisify } from "util";

import App from "./App";
import { join } from "path";

const nodemailerCreateTestAccount = promisify(createTestAccount);
const ejsRenderFile = promisify(renderFile);

function sendMail(options, transporter) {
  return new Promise((resolve, reject) => {
    transporter.sendMail(options, (err, info) => {
      if (err) {
        reject(err);
      } else {
        console.log("Message sent: %s", info.messageId);
        // Preview only available when sending through an Ethereal account
        resolve(getTestMessageUrl(info));
      }
    });
  });
}

module.exports = async (req, res) => {
  const account = await nodemailerCreateTestAccount();

  const transporter = createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: account.user, // generated ethereal user
      pass: account.pass // generated ethereal password
    }
  });

  const jsx = <App />;
  const { html, css } = extractCritical(renderToStaticMarkup(jsx));
  const str = await ejsRenderFile(join(__dirname, "template.ejs"), {
    html,
    css
  });

  let mailOptions = {
    from: '"Fred Foo 👻" <foo@example.com>',
    to: "bar@example.com",
    subject: "Hello",
    html: str
  };

  const testUrl = await sendMail(mailOptions, transporter);
  send(
    res,
    200,
    `<a target="_blank" rel="noopener noreferer" href="${testUrl}">Test email URL</a>`
  );
};
