import React from 'react';
import {render} from 'react-dom';
import ROSLIB from 'roslib';
import App from './App';

const appElement = (<App />);

// In a browser environment, render instead of exporting
if (typeof window !== 'undefined') {
	render(appElement, document.getElementById('root'));
}

const ros = new ROSLIB.Ros({
	url: 'ws://10.194.183.51:9090'
});

ros.on('connection', function() {
	console.log('Connected to websocket server.');
});

ros.on('error', function(error) {
	console.log('Error connecting to websocket server: ', error);
});

ros.on('close', function() {
	console.log('Connection to websocket server closed.');
});

// Subscribing to a Topic
const listener = new ROSLIB.Topic({
	ros : ros,
	name : '/object_classifer/output',
	messageType : 'object_classifier/classified_object'
});

listener.subscribe(function(message) {
	console.log(message);
});

export default appElement;
