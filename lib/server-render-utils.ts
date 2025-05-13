import ReactDOMServer from 'react-dom/server';
import React from 'react';

/**
 * Renders a React component to a static HTML string.
 * This utility is intended for server-side operations where full HTML markup is needed,
 * for example, generating HTML for PDF creation.
 * 
 * @param Component The React component to render.
 * @param props The props to pass to the component.
 * @returns A static HTML string representation of the component.
 */
export function renderComponentToStaticMarkup<P extends {}>(
  Component: React.ComponentType<P>,
  props: P
): string {
  const element = React.createElement(Component, props);
  return ReactDOMServer.renderToStaticMarkup(element);
} 