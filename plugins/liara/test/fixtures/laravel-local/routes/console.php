<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('reports:send')->dailyAt('01:00');
