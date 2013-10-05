<?php
namespace lib;

/**
 * A JSON configuration file.
 * @author Simon Ser
 * @since 1.0beta3
 */
class JsonConfig extends Config {
	/**
	 * Input data from JSON.
	 * @param  string $json The JSON-encoded data.
	 */
	public function input($json) {
		if (empty($json)) {
			$this->data = array();
			return;
		}

		$this->data = json_decode($json, true);

		$jsonError = json_last_error();
		if ($jsonError != JSON_ERROR_NONE) {
			switch($jsonError) {
				case JSON_ERROR_DEPTH:
					$msg = 'The maximum stack depth has been exceeded';
					break;
				case JSON_ERROR_STATE_MISMATCH:
					$msg = 'Invalid or malformed JSON';
					break;
				case JSON_ERROR_CTRL_CHAR:
					$msg = 'Control character error, possibly incorrectly encoded';
					break;
				case JSON_ERROR_SYNTAX:
					$msg = 'Syntax error';
					break;
				case JSON_ERROR_UTF8:
					$msg = 'Malformed UTF-8 characters, possibly incorrectly encoded';
					break;
				default:
					$msg = 'Unknown error';
			}

			throw new \RuntimeException('Cannot decode JSON data (#'.$jsonError.' '.$msg.')');
		}
	}

	/**
	 * Output data to JSON.
	 * @param  array  $data The data.
	 * @return string       The JSON-encoded data.
	 */
	public function output(array $data) {
		if (defined('JSON_PRETTY_PRINT')) { //PHP >= 5.4
			$json = json_encode($data, JSON_PRETTY_PRINT);
		} else {
			$json = json_encode($data);
		}

		if ($json === false) {
			throw new \RuntimeException('Cannot encode configuration to JSON');
		}

		return $json;
	}
}