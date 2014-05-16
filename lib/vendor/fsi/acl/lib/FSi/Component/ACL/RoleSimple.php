<?php

namespace FSi\Component\ACL;

class RoleSimple implements RoleInterface
{
    protected $id;

    protected static $roles = array();

    protected function __construct($id)
    {
        $this->id = (string)$id;
    }

    public static function factory($id)
    {
        $id = (string)$id;
        if (!isset(static::$roles[$id])) {
            static::$roles[$id] = new static($id);
        }
        return static::$roles[$id];
    }

    public function __toString()
    {
        return $this->id;
    }
}
