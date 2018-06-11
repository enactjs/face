import ROSLIB from 'roslib';

function noop() {}

function connect({uri, onConnection, onMessage, onError, onClose} = {}) {
	if (!uri) throw new Error('Bot roslib URI required for usage.');

	const ros = new ROSLIB.Ros({
		url: uri
	});

	ros.on('connection', onConnection || (() => console.log(`ROSLIB: Connected to ${uri}`)));
	ros.on('error', onError || (err => console.log(`ROSLIB Error: ${JSON.stringify(err)}`)));
	ros.on('close', onClose || (() => console.log(`ROSLIB: Connection closed to ${uri}`)));

	// Subscribing to a Topic
	const listener = new ROSLIB.Topic({
		ros: ros,
		name: '/object_classifer/output',
		messageType: 'object_classifier/classified_object'
	});

	listener.subscribe(onMessage || noop);
	return {ros, listener};
}

export default connect;
