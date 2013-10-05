<?php
namespace lib\ctrl\api;

/**
 * Manage captchas.
 * @author $imon
 */
class CaptchaController extends \lib\ApiBackController {
	/**
	 * Generate a captcha.
	 */
	public function executeGet() {
		$manager = $this->managers()->getManagerOf('captcha');

		$captcha = $manager->generate();

		return array(
			'id' => $captcha['id'],
			'type' => $captcha['type'],
			'captcha' => $captcha['question']
		);
	}

	/**
	 * Check a captcha.
	 * @param int $id The captcha id.
	 * @param int $value The value to check.
	 */
	public function executeCheck($id, $value) {
		$manager = $this->managers()->getManagerOf('captcha');

		$captcha = $manager->get($id);
		$result = ($captcha['result'] == $value);
		return array('result' => $result);
	}
}