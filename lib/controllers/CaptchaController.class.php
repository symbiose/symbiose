<?php
namespace lib\controllers;

/**
 * CaptchaController permet de controller les captchas (images de verification).
 * @author $imon
 * @version 1.0
 */
class CaptchaController extends \lib\ServerCallComponent {
	/**
	 * Generer un captcha.
	 */
	protected function get() {
		$captcha = $this->webos()->managers()->get('Captcha')->get();

		$question = $captcha->generate();

		return array(
			'id' => $captcha->getId(),
			'type' => $captcha->getType(),
			'captcha' => $question
		);
	}

	/**
	 * Verifier un captcha.
	 * @param int $id L'id du captcha.
	 * @param int $value La valeur a tester.
	 */
	protected function check($id, $value) {
		$captcha = $this->webos()->managers()->get('Captcha')->get($id);
		return array('result' => $captcha->check($value));
	}
}