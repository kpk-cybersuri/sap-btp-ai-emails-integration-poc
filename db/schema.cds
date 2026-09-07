namespace my.app;

entity DailyIdocData {
    key ID          : UUID @readonly;
        DATE        : Date;
        MODULE      : String;
        DIRECTION   : String;
        MESTYP      : String;
        SYSTEM      : String;
        SUCESS_OAPI : Integer;
        FAIL_OAPI   : Integer;
        SUCESS_OCPI : Integer;
        FAIL_OCPI   : Integer;
        STATUSTEXT  : String;
}

entity DailyFetches {
    key ID        : UUID @readonly;
        fetchedAt : Timestamp;
}

entity AuthTokens {
    key ID          : UUID @readonly;
        accessToken : String;
        expiresAt   : Timestamp;
}

entity Authors {
    key ID          : UUID;
        name        : String(100);
        dateOfBirth : Date;
        dateOfDeath : Date;
}
