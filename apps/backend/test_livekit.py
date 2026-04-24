import datetime
from livekit.api import AccessToken, VideoGrants

def test():
    try:
        token = AccessToken(
            api_key="abc",
            api_secret="abc",
        )
        token.identity = "test"
        token.ttl = 3600
        print("TTL set to int")
        jwt = token.to_jwt()
        print("JWT generated")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test()
