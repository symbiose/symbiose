<?php
namespace lib;

/**
 * A response's content.
 * @author Simon Ser
 * @since 1.0beta3
 */
interface ResponseContent {
	/**
	 * Generate the response.
	 * @return string The generated response.
	 */
	public function generate();
}