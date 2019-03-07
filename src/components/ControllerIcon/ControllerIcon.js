// import PropTypes from 'prop-types';
import React from 'react';
import classnames from 'classnames'
import kind from '@enact/core/kind';
import hoc from '@enact/core/hoc';
import IconButton from '@enact/moonstone/IconButton';
import Touchable from '@enact/ui/Touchable';

import css from './ControllerIcon.module.less';

const ControllerIconBase = kind({
	name: 'ControllerIcon',

	styles: {
		css,
		className: 'controllerIcon'
	},

	computed: {
		className: ({mode, styler}) => styler.append(mode)
	},

	handlers: {
		onAnimationEnd: (ev, {onAnimationEnd}) => onAnimationEnd && onAnimationEnd()
	},

	render: ({...rest}) => {
		delete rest.mode;
		return (
			<IconButton minWidth={false} small {...rest} css={css}>
				closex
			</IconButton>
		);
	}
});

const defaultConfig = {
	activationProp: 'animating',
	animationClass: 'animating',
	defaultActive: false
};

const ControllerIconDecorator = hoc(defaultConfig, (config, Wrapped) => {
	return class extends React.Component {
		static displayName = 'ControllerIconDecorator'

		constructor () {
			super();
			this.state = {
				active: config.defaultActive
			};
		}

		componentWillReceiveProps (nextProps) {
			if (nextProps[config.activationProp] !== this.props[config.activationProp]) {
				this.activateAnimation();
			}
		}

		activateAnimation = () => {
			this.setState({active: true});
		}

		deactivateAnimation = () => {
			console.log('deactivateAnimation');
			this.setState({active: false});
		}

		render () {
			return <Wrapped
				{...this.props}
				className={classnames(this.props.className, (this.state.active ? config.animationClass : ''))}
				onAnimationEnd={this.deactivateAnimation}
			/>;
		}
	};
});


const ControllerIcon = Touchable(ControllerIconDecorator({activationProp: 'mode', animationClass: css.animating}, ControllerIconBase));

export default ControllerIcon;
