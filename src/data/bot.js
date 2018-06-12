/* eslint no-console: off */
import ROSLIB from 'roslib';

function noop () {}

function connect ({url, onConnection, onMessage, onError, onClose} = {}) {
	if (!url) throw new Error('Bot roslib url required for usage.');

	const ros = new ROSLIB.Ros({url});

	ros.on('connection', onConnection || (() => console.log(`ROSLIB: Connected to ${url}`)));
	ros.on('error', onError || (err => console.log(`ROSLIB Error: ${JSON.stringify(err)}`)));
	ros.on('close', onClose || (() => console.log(`ROSLIB: Connection closed to ${url}`)));

	// Subscribing to a Topic
	const listener = new ROSLIB.Topic({
		ros: ros,
		name: '/object_classifier/output',
		messageType: 'object_classifier/classified_object'
	});

	listener.subscribe(onMessage || noop);
	return {ros, listener};
}

export default connect;
