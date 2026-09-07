// srv/visualisation-service.cds
using my.app as db from '../db/schema.cds';

service VisualisationService @(path: '/visuals') {
    function generateBarChart(needfullHtml: Boolean) returns String;
}