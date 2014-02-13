<?php
namespace lib\manager;

use \lib\entities\Captcha;

class CaptchaManager_session extends CaptchaManager {
	/**
	 * Get a captcha.
	 * @param int $id The captcha id.
	 */
	public function get($id) {
		$captchas = $this->dao->get('captchas');
		$id = (int) $id;

		if (!isset($captchas[$id])) {
			throw new \InvalidArgumentException('Cannot find captcha with id #'.$id.'. Your session might be outdated, please try again');
		}

		$captcha = unserialize($captchas[$id]);

		return $captcha;
	}

	public function generate() {
		$captchas = $this->dao->get('captchas');

		$captcha = $this->_generateCaptcha();

		$keys = array_keys($captchas);
		$id = (count($keys) > 0) ? array_pop($keys) + 1 : 0;

		$captcha->setId($id);

		//Save captcha
		$captchas[$id] = serialize($captcha);
		$this->dao->set('captchas', $captchas);

		return $captcha;
	}
}