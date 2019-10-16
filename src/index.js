import React from 'react';
import {render} from 'react-dom';
import config from '../config.json';
import App from './App';

const appElement = (<App {...config} />);

// In a browser environment, render instead of exporting
if (typeof window !== 'undefined') {
	render(appElement, document.getElementById('root'));
}

export default appElement;
