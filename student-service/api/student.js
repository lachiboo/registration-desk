'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); 

AWS.config.setPromisesDependency(require('bluebird'));

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.submit = (event, context, callback) => {
  const requestBody = JSON.parse(event.body);
  const fullname = requestBody.fullname;
  const email = requestBody.email;
  const experience = requestBody.experience;

  if (typeof fullname !== 'string' || typeof email !== 'string' || typeof experience !== 'number') {
    console.error('Validation Failed');
    callback(new Error('Couldn\'t submit student because of validation errors.'));
    return;
  }

  submitStudentP(studentInfo(fullname, email, experience))
    .then(res => {
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({
          message: `Sucessfully submitted student with email ${email}`,
          studentId: res.id
        })
      });
    })
    .catch(err => {
      console.log(err);
      callback(null, {
        statusCode: 500,
        body: JSON.stringify({
          message: `Unable to submit student with email ${email}`
        })
      })
    });
};

module.exports.list = (event, context, callback) => {
  var params = {
      TableName: process.env.STUDENT_TABLE,
      ProjectionExpression: "id, fullname, email"
  };

  console.log("Scanning Student table.");
  const onScan = (err, data) => {

      if (err) {
          console.log('Scan failed to load data. Error JSON:', JSON.stringify(err, null, 2));
          callback(err);
      } else {
          console.log("Scan succeeded.");
          return callback(null, {
              statusCode: 200,
              body: JSON.stringify({
                  students: data.Items
              })
          });
      }

  };

  dynamoDb.scan(params, onScan);

};

module.exports.get = (event, context, callback) => {
  const params = {
    TableName: process.env.STUDENT_TABLE,
    Key: {
      id: event.pathParameters.id,
    },
  };

  dynamoDb.get(params).promise()
    .then(result => {
      const response = {
        statusCode: 200,
        body: JSON.stringify(result.Item),
      };
      callback(null, response);
    })
    .catch(error => {
      console.error(error);
      callback(new Error('Couldn\'t fetch student.'));
      return;
    });
};


const submitStudentP = student => {
  console.log('Submitting student');
  const studentInfo = {
    TableName: process.env.STUDENT_TABLE,
    Item: student,
  };
  return dynamoDb.put(studentInfo).promise()
    .then(res => student);
};

const studentInfo = (fullname, email, experience) => {
  const timestamp = new Date().getTime();
  return {
    id: uuid.v1(),
    fullname: fullname,
    email: email,
    experience: experience,
    submittedAt: timestamp,
    updatedAt: timestamp,
  };
};